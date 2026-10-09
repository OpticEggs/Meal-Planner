import sys
o=[l.rstrip("\n").split("\t") for l in open(sys.argv[1])]
n=[l.rstrip("\n").split("\t") for l in open(sys.argv[2])]
assert len(o)==len(n), (len(o),len(n))
st={}; ch=0
for a,b in zip(o,n):
    assert a[0]==b[0]
    if a[1]!=b[1]:
        ch+=1; k=(a[1].split()[0], b[1].split()[0]); st[k]=st.get(k,0)+1
print("changed",ch,"of",len(o), st)
if len(sys.argv)>3:
    for a,b in zip(o,n):
        if a[1]!=b[1]: print(a[0]); print("   OLD", a[1]); print("   NEW", b[1])
