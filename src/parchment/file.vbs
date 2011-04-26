' Idea from http://stackoverflow.com/questions/1919972/#3050364

' Convert a byte array (xhr.responseBody) into a 16-bit characters string
' Javascript code will separate the characters back into 8-bit numbers again
Function VBCStr(x)
	VBCStr = CStr(x)
End Function

' If the byte array has an odd length, this function is needed to get the last byte
Function VBLastAsc(x)
	Dim l
	l = LenB(x)
	If l mod 2 Then
		VBLastAsc = AscB(MidB(x, l, 1))
	Else
		VBLastAsc = -1
	End If
End Function